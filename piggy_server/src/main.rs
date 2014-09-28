extern crate serialize;
extern crate postgres; 

use postgres::{PostgresConnection, NoSsl}; 

use serialize::json;

#[deriving(Decodable, Encodable)]
pub struct TestStruct  {
    data_int: u8,
    data_str: String,
    data_vector: Vec<u8>,
}


#[deriving(Decodable, Encodable)]
pub struct Place {
	id: i32 ,
	name: String,
}

#[deriving(Decodable, Encodable)]
pub struct Persely {
	id: i32 ,
	place_id: i32,
	name: String,
	goal_value: int
}

#[deriving(Decodable, Encodable)]
pub enum PlanningType {
	Expense,
    Save, 
}

#[deriving(Decodable, Encodable)]
pub enum TransactionType {
	Spending,
    Flagging,
    IgnoreInBudgetFlagging,  
}

#[deriving(Decodable, Encodable)]
pub struct BudgetEntry {
	id: i32 ,
	budgeted_for: String,
	budgeted_value: int,
	planning_type: PlanningType,
}

#[deriving(Decodable, Encodable)]
pub struct MoneyTransaction {
	id: i32 ,
	src: String,
	dst: String,
	transaction_type: TransactionType,
	value: int,
	year: int,
	month: int,
	day: int,
}

fn main() {
    let object = TestStruct {
        data_int: 1,
        data_str: "toto".to_string(),
        data_vector: vec![2,3,4,5],
    };

    // Serialize using `json::encode`
    let encoded = json::encode(&object);
    println!("{:s}", encoded);

    // Deserialize using `json::decode`
    let decoded: TestStruct = json::decode(encoded.as_slice()).unwrap();
	
	let conn = PostgresConnection::connect("postgresql://postgres@localhost",
                                           &NoSsl).unwrap(); 
	let stmt = conn.prepare("SELECT id, name FROM place")
            .unwrap(); 
	let mut places = vec![];
	for row in stmt.query([]).unwrap() {
        let person = Place {
            id: row.get(0u),
            name: row.get(1u),
        };
		places.push(person);
        
    } 
} 